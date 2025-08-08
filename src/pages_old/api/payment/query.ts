
// ============================================================================
// TODO: 支付功能临时禁用
// 原因: 依赖问题导致支付模块无法正常工作
// 计划: 在第二阶段重新启用并完善支付功能
// 影响: 不影响旅游规划等核心功能的正常使用
// ============================================================================

/**
 * 智游助手v6.2 - 支付查询API端点
 * 查询支付订单状态
 * 支持微信支付和支付宝查询
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withMetrics } from '../../../lib/monitoring/metrics-middleware';
// // import { paymentGateway } from '../../../lib/payment/payment-gateway'; // 临时禁用 // 临时禁用
import { requireAuth, AuthenticatedRequest } from '../../../lib/auth/auth-middleware';

interface QueryRequest {
  outTradeNo: string;        // 商户订单号
  paymentMethod?: 'wechat' | 'alipay'; // 支付方式（可选）
}

interface QueryResponse {
  success: boolean;
  outTradeNo?: string;
  tradeNo?: string;          // 第三方交易号
  paymentMethod?: string;    // 支付方式
  amount?: number;           // 订单金额
  paidAmount?: number;       // 实际支付金额
  status?: string;           // 支付状态
  paidAt?: string;           // 支付时间
  error?: string;
  timestamp: string;
}

async function queryHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse<QueryResponse>
) {
  try {
    // 支持GET和POST请求
    if (!['GET', 'POST'].includes(req.method || '')) {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({
        success: false,
        error: `Method ${req.method} Not Allowed`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 获取用户信息
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 从query参数或body获取参数
    const outTradeNo = req.method === 'GET' 
      ? req.query.outTradeNo as string
      : req.body.outTradeNo;
    
    const paymentMethod = req.method === 'GET'
      ? req.query.paymentMethod as string
      : req.body.paymentMethod;

    // 输入验证
    if (!outTradeNo) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameter: outTradeNo',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 订单号格式验证
    if (!/^ST\d+[A-Z0-9]+$/.test(outTradeNo)) {
      res.status(400).json({
        success: false,
        error: 'Invalid order number format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`🔍 查询支付状态: ${outTradeNo}`);

    try {
      // 调用统一支付网关查询订单
// //       const queryResult = await paymentGateway.queryPayment( // 临时禁用 // 临时禁用
        outTradeNo,
        paymentMethod as 'wechat' | 'alipay'
      );

      if (!queryResult.success) {
        res.status(404).json({
          success: false,
          error: queryResult.error || 'Payment not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 映射支付状态
      const statusMap: Record<string, string> = {
        'TRADE_SUCCESS': 'paid',
        'TRADE_FINISHED': 'paid',
        'WAIT_BUYER_PAY': 'pending',
        'TRADE_CLOSED': 'cancelled',
        'TRADE_REFUND': 'refunded',
        'SUCCESS': 'paid',
        'REFUND': 'refunded',
        'NOTPAY': 'pending',
        'CLOSED': 'cancelled',
        'REVOKED': 'cancelled',
        'USERPAYING': 'pending',
        'PAYERROR': 'failed'
      };

      const mappedStatus = statusMap[queryResult.tradeStatus] || 'unknown';

      const response: QueryResponse = {
        success: true,
        outTradeNo,
        tradeNo: queryResult.tradeNo,
        paymentMethod: queryResult.paymentMethod || paymentMethod,
        amount: queryResult.totalAmount ? Math.round(parseFloat(queryResult.totalAmount) * 100) : undefined,
        paidAmount: queryResult.totalAmount ? Math.round(parseFloat(queryResult.totalAmount) * 100) : undefined,
        status: mappedStatus,
        paidAt: queryResult.paidAt || (mappedStatus === 'paid' ? new Date().toISOString() : undefined),
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);

      console.log(`✅ 支付查询成功: ${outTradeNo} 状态: ${mappedStatus}`);

    } catch (queryError) {
      console.error('❌ 支付查询网关调用失败:', queryError);
      
      res.status(500).json({
        success: false,
        error: 'Payment query gateway error',
        timestamp: new Date().toISOString()
      });
      return;
    }

  } catch (error) {
    console.error('❌ 支付查询异常:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during payment query',
      timestamp: new Date().toISOString()
    });
  }
}

// 导出带认证和监控的处理器
export default requireAuth()(
  withMetrics(queryHandler, {
    service: 'smart-travel-v6.2-payment-service'
  })
);
