/**
 * 旅行数据API路由
 * 服务器端处理高德API调用，解决浏览器端环境变量访问问题
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { TravelDataService } from '../../services/travel-data-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination, modules } = req.body;

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    console.log(`🔄 API: 获取 ${destination} 的旅行数据...`);

    const travelDataService = new TravelDataService();
    
    // 根据请求的模块获取相应数据
    if (modules && Array.isArray(modules)) {
      const results: any = {};
      
      for (const module of modules) {
        try {
          switch (module) {
            case 'food':
              results.food = await travelDataService.getFoodData(destination);
              break;
            case 'accommodation':
              results.accommodation = await travelDataService.getAccommodationData(destination);
              break;
            case 'transport':
              results.transport = await travelDataService.getTransportData(destination);
              break;
            case 'tips':
              results.tips = await travelDataService.getTipsData(destination);
              break;
            default:
              console.warn(`未知模块: ${module}`);
          }
        } catch (error) {
          console.error(`模块 ${module} 数据获取失败:`, error);
          results[module] = { success: false, error: error instanceof Error ? error.message : '未知错误' };
        }
      }
      
      return res.status(200).json(results);
    } else {
      // 获取所有数据
      const results = await travelDataService.getAllTravelData(destination);
      return res.status(200).json(results);
    }

  } catch (error) {
    console.error('❌ 旅行数据API错误:', error);
    
    // 返回错误信息
    return res.status(500).json({
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 智能默认数据API路由
 */
export async function getIntelligentDefaultData(req: NextApiRequest, res: NextApiResponse) {
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
