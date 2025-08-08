/**
 * 智游助手v6.2 - 创建支付订单API端点
 * 简化版本，用于前端调用
 *
 * TODO: 支付功能临时禁用 - 整个支付创建API
 */

import { NextApiRequest, NextApiResponse } from 'next';
// import { withMetrics, updateMetrics } from '../../../lib/monitoring/metrics-middleware';

interface CreatePaymentRequest {
  serviceType: string;
  amount: number;
  description: string;
  paymentMethod: 'wechat' | 'alipay';
  paymentType: 'h5' | 'qr';
}

interface CreatePaymentResponse {
  success: boolean;
  paymentId?: string;
  outTradeNo?: string;
  paymentUrl?: string;
  qrCode?: string;
  error?: string;
  timestamp: string;
}

async function createPaymentHandler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePaymentResponse>
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

    const {
      serviceType,
      amount,
      description,
      paymentMethod,
      paymentType
    }: CreatePaymentRequest = req.body;

    // 基础验证
    if (!serviceType || !amount || !description || !paymentMethod || !paymentType) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 金额验证
    if (amount <= 0 || amount > 30000) { // 最大300元
      res.status(400).json({
        success: false,
        error: 'Invalid amount',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 生成订单号
    const outTradeNo = `ST${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 模拟支付订单创建成功
    let qrCode: string | undefined;
    let paymentUrl: string | undefined;

    if (paymentType === 'qr') {
      // 根据支付方式返回对应的收款码
      if (paymentMethod === 'wechat') {
        qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      } else if (paymentMethod === 'alipay') {
        qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      }
    } else if (paymentType === 'h5') {
      // H5支付返回支付链接
      if (paymentMethod === 'wechat') {
        paymentUrl = `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=${paymentId}`;
      } else if (paymentMethod === 'alipay') {
        paymentUrl = `https://openapi.alipay.com/gateway.do?method=alipay.trade.wap.pay&prepay_id=${paymentId}`;
      }
    }

    // 更新业务指标（暂时禁用）
    // updateMetrics({
    //   orderCompletionRate: 0.95 + Math.random() * 0.04,
    //   activeUsers: Math.floor(Math.random() * 50) + 100,
    //   paymentMethodDistribution: {
    //     [paymentMethod]: (Math.random() * 0.3 + 0.4)
    //   }
    // });

    const response: CreatePaymentResponse = {
      success: true,
      paymentId,
      outTradeNo,
      paymentUrl,
      qrCode,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);

    console.log(`✅ 支付订单创建成功: ${paymentId} (${outTradeNo})`);
    console.log(`💳 支付方式: ${paymentMethod}-${paymentType}`);
    console.log(`💰 订单金额: ${amount}分 (${(amount/100).toFixed(2)}元)`);

  } catch (error) {
    console.error('Error during payment creation:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during payment creation',
      timestamp: new Date().toISOString()
    });
  }
}

// 导出处理器（暂时禁用监控以便测试）
export default createPaymentHandler;
