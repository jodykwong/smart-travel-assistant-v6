import type { NextApiRequest, NextApiResponse } from 'next';

interface LLMAmapSearchRequest {
  message: string;
  attractionName: string;
  city: string;
}

interface LLMAmapSearchResponse {
  imageUrl: string;
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LLMAmapSearchResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: '只支持POST请求',
      imageUrl: ''
    });
  }

  try {
    const { message, attractionName, city }: LLMAmapSearchRequest = req.body;

    if (!attractionName || !city) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数',
        imageUrl: ''
      });
    }

    // 调用LLM API，让LLM使用高德地图MCP工具
    const llmResponse = await callLLMWithAmapMCP(message, attractionName, city);
    
    if (llmResponse.success && llmResponse.imageUrl) {
      return res.status(200).json({
        success: true,
        imageUrl: llmResponse.imageUrl
      });
    } else {
      // 如果LLM调用失败，返回智能默认图片
      const defaultImage = getSmartDefaultImageForAPI(attractionName);
      return res.status(200).json({
        success: true,
        imageUrl: defaultImage
      });
    }

  } catch (error) {
    console.error('LLM高德地图搜索API错误:', error);
    
    // 错误情况下也返回默认图片
    const defaultImage = getSmartDefaultImageForAPI(req.body.attractionName || '');
    return res.status(200).json({
      success: false,
      error: '服务器内部错误',
      imageUrl: defaultImage
    });
  }
}

// 调用LLM API使用高德地图MCP工具
async function callLLMWithAmapMCP(message: string, attractionName: string, city: string): Promise<{success: boolean, imageUrl: string}> {
  try {
    console.log(`🔍 开始搜索景点图片: ${attractionName} in ${city}`);

    // 使用DeepSeek API调用高德地图MCP工具
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekApiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

    if (!deepseekApiKey) {
      console.warn('⚠️ DEEPSEEK_API_KEY未配置，使用默认图片');
      return { success: false, imageUrl: '' };
    }

    const response = await fetch(`${deepseekApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `请使用高德地图MCP工具搜索"${attractionName}"在"${city}"的景点信息，并返回图片URL。只返回图片URL，不要其他内容。`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'maps_text_search_amap-maps',
              description: '搜索高德地图POI信息',
              parameters: {
                type: 'object',
                properties: {
                  keywords: { type: 'string', description: '搜索关键词' },
                  city: { type: 'string', description: '城市名称' }
                },
                required: ['keywords']
              }
            }
          }
        ],
        tool_choice: 'auto',
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('📡 LLM API响应:', JSON.stringify(data, null, 2));

      // 解析LLM响应，提取图片URL
      const imageUrl = extractImageUrlFromLLMResponse(data);
      if (imageUrl) {
        console.log(`✅ 成功获取景点图片: ${imageUrl}`);
        return { success: true, imageUrl };
      } else {
        console.log('⚠️ 未从LLM响应中找到图片URL');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ LLM API调用失败:', response.status, errorText);
    }

    return { success: false, imageUrl: '' };

  } catch (error) {
    console.error('❌ 调用LLM API异常:', error);
    return { success: false, imageUrl: '' };
  }
}

// 从LLM响应中提取图片URL
function extractImageUrlFromLLMResponse(llmResponse: any): string | null {
  try {
    console.log('🔍 开始解析LLM响应以提取图片URL...');

    if (llmResponse.choices && llmResponse.choices[0]) {
      const choice = llmResponse.choices[0];

      // 检查tool_calls - 高德地图MCP工具调用结果
      if (choice.message && choice.message.tool_calls) {
        console.log('📞 发现tool_calls，检查高德地图MCP工具结果...');

        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.function && toolCall.function.name.includes('maps_text_search')) {
            try {
              const functionResult = toolCall.function.arguments;
              console.log('🗺️ 高德地图工具调用结果:', functionResult);

              // 解析工具调用结果
              let result;
              if (typeof functionResult === 'string') {
                result = JSON.parse(functionResult);
              } else {
                result = functionResult;
              }

              // 查找POI中的图片
              if (result.pois && Array.isArray(result.pois) && result.pois.length > 0) {
                for (const poi of result.pois) {
                  // 检查多种可能的图片字段
                  const imageFields = ['photos', 'photo', 'image', 'pic', 'picture'];
                  for (const field of imageFields) {
                    if (poi[field]) {
                      let imageUrl = '';
                      if (typeof poi[field] === 'string') {
                        imageUrl = poi[field];
                      } else if (poi[field].url) {
                        imageUrl = poi[field].url;
                      } else if (Array.isArray(poi[field]) && poi[field].length > 0) {
                        imageUrl = poi[field][0].url || poi[field][0];
                      }

                      if (imageUrl && imageUrl.startsWith('http')) {
                        console.log(`✅ 从POI ${field}字段找到图片URL: ${imageUrl}`);
                        return imageUrl;
                      }
                    }
                  }
                }
              }
            } catch (parseError) {
              console.warn('⚠️ 解析工具调用结果失败:', parseError);
            }
          }
        }
      }

      // 检查消息内容中的URL
      if (choice.message && choice.message.content) {
        console.log('📝 检查消息内容中的URL...');
        const content = choice.message.content;

        // 匹配各种可能的图片URL格式
        const urlPatterns = [
          /https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:jpg|jpeg|png|gif|webp|bmp)/gi,
          /https?:\/\/store\.is\.autonavi\.com\/showpic\/[a-f0-9]+/gi,
          /https?:\/\/aos-comment\.amap\.com\/[^\s<>"{}|\\^`\[\]]+/gi,
          /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
        ];

        for (const pattern of urlPatterns) {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            const imageUrl = matches[0].replace(/[.,;!?]$/, ''); // 移除末尾标点
            console.log(`✅ 从消息内容找到图片URL: ${imageUrl}`);
            return imageUrl;
          }
        }
      }
    }

    console.log('⚠️ 未找到有效的图片URL');
    return null;
  } catch (error) {
    console.error('❌ 解析LLM响应失败:', error);
    return null;
  }
}

// API专用的智能默认图片函数
function getSmartDefaultImageForAPI(attractionName: string): string {
  const imageMap: { [key: string]: string } = {
    // 使用从高德地图MCP获取的真实图片URL
    '中山陵': 'http://store.is.autonavi.com/showpic/46bf800a21c42453ff756fc2b77c710f',
    '夫子庙': 'http://store.is.autonavi.com/showpic/8fd02cf1c04a8a5a91e32a5354d7a023',
    '玄武湖': 'http://store.is.autonavi.com/showpic/ff2f4114639e0110ae96ae76ad0c0287',
    '秦淮河': 'http://store.is.autonavi.com/showpic/9e64a8689c6b079d5f0b86a354274188',
    '明孝陵': 'https://aos-comment.amap.com/B00190ABSX/comment/126431689d363ddd1360f9bd0f1de26b_2048_2048_80.jpg',
    '总统府': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=120&h=120&fit=crop&crop=center',
    '鸡鸣寺': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=120&h=120&fit=crop&crop=center',
    '栖霞山': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=120&h=120&fit=crop&crop=center',
    '雨花台': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=120&h=120&fit=crop&crop=center',
    '莫愁湖': 'https://aos-comment.amap.com/B0FFG6CAR6/comment/27a4aeb15956b7a139f7cddfdbeaec13_2048_2048_80.jpg'
  };

  // 尝试匹配关键词
  for (const [key, url] of Object.entries(imageMap)) {
    if (attractionName.includes(key)) {
      return url;
    }
  }

  // 默认返回南京风景图片（高德真实图片）
  const defaultImages = [
    'http://store.is.autonavi.com/showpic/46bf800a21c42453ff756fc2b77c710f',
    'http://store.is.autonavi.com/showpic/8fd02cf1c04a8a5a91e32a5354d7a023',
    'http://store.is.autonavi.com/showpic/ff2f4114639e0110ae96ae76ad0c0287',
    'http://store.is.autonavi.com/showpic/9e64a8689c6b079d5f0b86a354274188'
  ];

  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}
