
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 微信支付MCP体验版 - 创建订单API
 * 
 * 重要说明：
 * - 这是体验版实现，仅支持1分钱测试支付
 * - 不用于真实商业交易，仅用于技术验证
 * - 商业化请使用支付宝当面付方案
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

interface CreateOrderRequest {
  serviceType: string;
  description: string;
  userId: string;
}

interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  qrCode?: string;
  outTradeNo?: string;
  amount?: number;
  expiredAt?: string;
  error?: string;
}

// 模拟订单存储（实际项目中应使用数据库）
const orders = new Map<string, any>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateOrderResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: '仅支持POST请求'
    });
  }

  try {
    const { serviceType, description, userId }: CreateOrderRequest = req.body;

    // 参数验证
    if (!serviceType || !description || !userId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 生成订单信息
    const orderId = `WXMCP_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const outTradeNo = `ST_MCP_${Date.now()}`;
    const amount = 1; // 体验版固定1分钱
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟过期

    console.log('🎭 创建微信支付MCP订单:', {
      orderId,
      outTradeNo,
      amount: `${amount}分（体验版限制）`,
      description: `${description}（技术验证）`
    });

    // 模拟调用腾讯元器微信支付MCP API
    const qrCode = await generateMockQRCode(outTradeNo);

    // 保存订单信息
    const order = {
      orderId,
      userId,
      amount,
      description: `${description}（体验版-1分钱）`,
      serviceType,
      status: 'created',
      qrCode,
      outTradeNo,
      createdAt: new Date(),
      expiredAt
    };

    orders.set(orderId, order);

    // 返回成功响应
    res.status(200).json({
      success: true,
      orderId,
      qrCode,
      outTradeNo,
      amount,
      expiredAt: expiredAt.toISOString()
    });

  } catch (error) {
    console.error('❌ 微信支付MCP订单创建失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
}

/**
 * 生成模拟QR码（实际项目中调用真实的MCP API）
 */
async function generateMockQRCode(outTradeNo: string): Promise<string> {
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 生成模拟的微信支付QR码URL
  const mockQRData = `weixin://wxpay/bizpayurl?pr=${Buffer.from(`mock_${outTradeNo}_${Date.now()}`).toString('base64').substring(0, 32)}`;
  
  console.log('🔧 生成模拟QR码:', mockQRData);
  
  return mockQRData;
}

// 导出订单存储供其他API使用
export { orders };
