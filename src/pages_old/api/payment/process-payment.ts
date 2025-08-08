
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { withPaymentMetrics, updateMetrics } from '../../../lib/monitoring/metrics-middleware';

/**
 * 支付处理API端点
 * 隔离式支付验证架构 - 支付处理节点
 */

interface ProcessPaymentRequest {
  orderId: string;
  paymentMethod: 'wechat' | 'alipay';
  amount: number;
  paymentToken?: string;
}

interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  status?: 'pending' | 'completed' | 'failed';
  error?: string;
  timestamp: string;
}

async function processPaymentHandler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessPaymentResponse>
) {
  try {
    // 只允许POST请求
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      res.status(405).json({
        success: false,
        error: `Method ${req.method} Not Allowed`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { orderId, paymentMethod, amount, paymentToken }: ProcessPaymentRequest = req.body;

    // 输入验证
    if (!orderId || !paymentMethod || !amount) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, paymentMethod, amount',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!['wechat', 'alipay'].includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        error: 'Invalid payment method. Must be wechat or alipay',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 模拟支付处理时间（根据支付方式不同）
    const processingTime = paymentMethod === 'wechat' 
      ? Math.random() * 1000 + 500  // 微信支付: 500-1500ms
      : Math.random() * 800 + 300;  // 支付宝: 300-1100ms
    
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // 模拟支付成功率（微信98%，支付宝99%）
    const successRate = paymentMethod === 'wechat' ? 0.98 : 0.99;
    const shouldSucceed = Math.random() < successRate;

    if (!shouldSucceed) {
      // 模拟不同类型的支付失败
      const errorTypes = [
        'insufficient_funds',
        'payment_timeout',
        'network_error',
        'invalid_payment_token',
        'payment_declined'
      ];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      
      res.status(400).json({
        success: false,
        status: 'failed',
        error: `Payment failed: ${errorType}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 生成交易ID
    const transactionId = `TXN_${paymentMethod.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 更新支付成功率指标
    const currentSuccessRate = paymentMethod === 'wechat' ? 0.98 : 0.99;
    updateMetrics({
      paymentSuccessRate: currentSuccessRate + (Math.random() - 0.5) * 0.02, // 小幅波动
    });

    const response: ProcessPaymentResponse = {
      success: true,
      transactionId,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error processing payment:', error);
    
    res.status(500).json({
      success: false,
      status: 'failed',
      error: 'Internal server error during payment processing',
      timestamp: new Date().toISOString()
    });
  }
}

// 导出带支付监控的处理器
export default withPaymentMetrics(processPaymentHandler, 'payment_processing');
