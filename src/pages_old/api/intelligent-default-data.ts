/**
 * 智能默认数据API路由
 * 专门处理前端降级场景的智能默认数据生成
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { TravelDataService } from '../../services/travel-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    console.log(`🔄 API: 生成 ${destination} 的智能默认数据...`);

    const travelDataService = new TravelDataService();
    const defaultData = await travelDataService.getIntelligentDefaultData(destination);
    
    return res.status(200).json({
      success: true,
      data: defaultData,
      source: 'intelligent-default',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 智能默认数据API错误:', error);
    
    return res.status(500).json({
      error: '智能默认数据生成失败',
      message: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString(),
    });
  }
}
