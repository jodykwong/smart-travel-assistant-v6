
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 微信支付MCP体验版 - 查询支付状态API
 * 
 * 重要说明：
 * - 这是体验版实现，仅支持1分钱测试支付
 * - 不用于真实商业交易，仅用于技术验证
 * - 商业化请使用支付宝当面付方案
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { orders } from '../create-order';

interface QueryStatusResponse {
  success: boolean;
  status?: string;
  paidAt?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueryStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: '仅支持GET请求'
    });
  }

  try {
    const { orderId } = req.query;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: '订单ID不能为空'
      });
    }

    // 获取订单信息
    const order = orders.get(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: '订单不存在'
      });
    }

    // 检查订单是否过期
    if (new Date() > new Date(order.expiredAt) && order.status === 'created') {
      order.status = 'expired';
      orders.set(orderId, order);
    }

    // 如果订单已支付，直接返回
    if (order.status === 'paid') {
      return res.status(200).json({
        success: true,
        status: 'paid',
        paidAt: order.paidAt
      });
    }

    // 模拟调用微信支付MCP API查询支付状态
    const mcpResponse = await queryMCPPaymentStatus(order.outTradeNo);

    if (mcpResponse.success) {
      // 更新订单状态
      if (mcpResponse.trade_state === 'SUCCESS') {
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        orders.set(orderId, order);
        
        console.log('🎉 支付成功确认:', orderId);
      }

      res.status(200).json({
        success: true,
        status: order.status,
        paidAt: order.paidAt
      });
    } else {
      res.status(500).json({
        success: false,
        error: mcpResponse.error || '查询支付状态失败'
      });
    }

  } catch (error) {
    console.error('❌ 查询支付状态失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
}

/**
 * 模拟调用微信支付MCP API查询支付状态
 */
async function queryMCPPaymentStatus(outTradeNo: string): Promise<{
  success: boolean;
  trade_state?: string;
  trade_state_desc?: string;
  error?: string;
}> {
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('🔧 查询微信支付MCP状态:', outTradeNo);

    // 模拟支付状态（30%概率已支付，用于演示）
    const isPaid = Math.random() > 0.7;
    
    return {
      success: true,
      trade_state: isPaid ? 'SUCCESS' : 'NOTPAY',
      trade_state_desc: isPaid ? '支付成功' : '未支付'
    };

  } catch (error) {
    console.error('❌ MCP API查询失败:', error);
    return {
      success: false,
      error: 'API调用失败'
    };
  }
}
