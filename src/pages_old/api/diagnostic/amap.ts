/**
 * 高德API诊断端点
 * 提供全面的API故障诊断和分析
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { AmapDiagnosticService } from '../../../services/diagnostic/amap-diagnostic-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST和GET请求
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination = '北京' } = req.method === 'POST' ? req.body : req.query;

    console.log(`🔍 开始诊断高德API，测试目的地: ${destination}`);

    const diagnosticService = new AmapDiagnosticService();
    const result = await diagnosticService.runFullDiagnostic(destination as string);

    // 根据诊断结果设置HTTP状态码
    let statusCode = 200;
    if (result.overallStatus === 'failed') {
      statusCode = 503; // Service Unavailable
    } else if (result.overallStatus === 'degraded') {
      statusCode = 206; // Partial Content
    }

    return res.status(statusCode).json({
      success: result.overallStatus !== 'failed',
      diagnostic: result,
      summary: {
        status: result.overallStatus,
        keyIssues: result.recommendations.slice(0, 3),
        nextActions: result.nextSteps.slice(0, 2),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 诊断API错误:', error);
    
    return res.status(500).json({
      success: false,
      error: '诊断服务内部错误',
      message: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString(),
    });
  }
}
