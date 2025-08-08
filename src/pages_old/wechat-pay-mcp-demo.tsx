/**
 * 智游助手v6.2 - 微信支付MCP体验版演示页面
 * 
 * 重要说明：
 * - 这是体验版演示，仅支持1分钱测试支付
 * - 不用于真实商业交易，仅用于技术验证
 * - 商业化请使用支付宝当面付方案
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { WechatPayMCPDemo } from '../components/payment/WechatPayMCPDemo';
import { ArrowLeft, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function WechatPayMCPDemoPage() {
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handlePaymentSuccess = (result: any) => {
    setPaymentResult(result);
    console.log('🎉 支付演示成功:', result);
  };

  const handlePaymentError = (error: string) => {
    console.error('❌ 支付演示失败:', error);
  };

  return (
    <>
      <Head>
        <title>微信支付MCP体验版演示 - 智游助手v6.2</title>
        <meta name="description" content="微信支付MCP体验版技术验证演示" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 头部导航 */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  返回首页
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  方案对比
                </button>
                <a
                  href="https://yuanqi.tencent.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  腾讯元器平台
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              微信支付MCP体验版演示
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              这是智游助手v6.2的微信支付MCP体验版技术验证演示。
              仅支持1分钱测试支付，用于验证技术可行性。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 支付演示区域 */}
            <div className="lg:col-span-2">
              <WechatPayMCPDemo
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />

              {/* 支付结果 */}
              {paymentResult && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="font-medium text-green-800">技术验证成功</h3>
                  </div>
                  <div className="text-sm text-green-700">
                    <p>微信支付MCP API调用成功</p>
                    <p>支付流程完整性验证通过</p>
                    <p>前后端集成测试完成</p>
                  </div>
                </div>
              )}
            </div>

            {/* 侧边栏信息 */}
            <div className="space-y-6">
              {/* 技术说明 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">技术验证目标</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    验证微信支付MCP API调用
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    测试QR码生成和显示
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    验证支付状态实时查询
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    测试前后端完整集成
                  </li>
                </ul>
              </div>

              {/* 体验版限制 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-800 mb-2">体验版限制</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• 仅支持1分钱测试支付</li>
                      <li>• 必须在腾讯元器平台内运行</li>
                      <li>• 不能用于真实商业交易</li>
                      <li>• API功能受限</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 商业化建议 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-medium text-blue-800 mb-2">商业化建议</h3>
                <div className="text-sm text-blue-700 space-y-2">
                  <p><strong>技术验证阶段：</strong>使用微信支付MCP体验版</p>
                  <p><strong>商业化阶段：</strong>切换到支付宝当面付方案</p>
                  <p><strong>长期规划：</strong>申请微信支付正式版</p>
                </div>
              </div>

              {/* 技术栈 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">技术栈</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">前端:</span>
                    <span className="font-medium">React + TypeScript</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">后端:</span>
                    <span className="font-medium">Next.js API Routes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">支付:</span>
                    <span className="font-medium">微信支付MCP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">平台:</span>
                    <span className="font-medium">腾讯元器</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 方案对比 */}
          {showComparison && (
            <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">支付方案对比</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        对比项
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        微信支付MCP体验版
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        支付宝当面付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        推荐用途
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">支付金额</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">❌ 仅1分钱</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✅ 单笔≤1000元</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">支付宝用于商业化</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">申请门槛</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✅ 无需营业执照</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">❌ 需要营业执照</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">MCP用于技术验证</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">平台限制</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">❌ 仅腾讯元器</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✅ 任意平台</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">支付宝更灵活</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">商业化能力</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">❌ 无法商业化</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">✅ 完整商业化</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">支付宝是最终选择</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
